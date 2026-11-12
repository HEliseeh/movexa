package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Subscription;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findAllByMemberIdOrderByStartDateDesc(Long memberId);

    /** La période valide la plus lointaine : c'est elle qui fixe la date de fin du membre. */
    Optional<Subscription> findFirstByMemberIdAndCancelledFalseOrderByEndDateDesc(Long memberId);
}
