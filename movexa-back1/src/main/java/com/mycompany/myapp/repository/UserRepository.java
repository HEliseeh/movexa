package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.User;
import com.mycompany.myapp.domain.enumeration.UserStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByStatus(UserStatus userStatus);

    Optional<User> findOneByEmailIgnoreCase(String email);
}
