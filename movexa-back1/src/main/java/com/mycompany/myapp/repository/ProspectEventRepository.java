package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.ProspectEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProspectEventRepository extends JpaRepository<ProspectEvent, Long> {}
